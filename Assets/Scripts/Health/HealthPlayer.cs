using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HealthPlayer : MonoBehaviour, IHealth
{

    //Delegates
    public delegate void PlayerPoint(HealthPlayer player);
    public delegate void PlayerHeart(HealthPlayer player);

    public static event PlayerHeart ReduceP1Heart;
    public static event PlayerHeart ReduceP2Heart;

    public static event PlayerHeart ReduceP3Heart;
    public static event PlayerHeart ReduceP4Heart;
    
    public static event PlayerPoint OnNewRound;

    public PlayerPoint OnP1Point;
    public PlayerPoint OnP2Point;

    public PlayerPoint OnP3Point;
    public PlayerPoint OnP4Point;

    //Delegates

    //GameObjects
    [SerializeField]
    private GameObject _roundObject;

    [SerializeField]
    private GameObject _sparkleFX;

    [SerializeField]
    private List<GameObject> _pointObjects;
    //GameObjects

    //Scripts
    private PlayerMovement _checkPort;
    private RoundManager _roundManager;

    private CameraShake _shakeCam; // NEEDS DELEGATE
    //Scripts

    private int playerHealth = 5;

    public int PlayerHealth
    {
        get { return playerHealth; }
        set { playerHealth += playerHealth; }
    }

    private int playerPoint = 1;

    public int GetPlayerPoint
    {
        get { return playerPoint; }
    }

 
   
    void Start()
    {
        
        _roundObject = GameObject.Find("RoundManager");
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _checkPort = this.GetComponent<PlayerMovement>();

        _shakeCam = GameObject.FindGameObjectWithTag("MainCamera").GetComponent<CameraShake>(); // NEEDS DELEGATE

    }

    void Update()
    {

        Armour();
        if (playerHealth <= 0)
            playerHealth = 0;


    }

    void Armour()
    {
        if (playerHealth > 5)
            _sparkleFX.SetActive(true);
        else
            _sparkleFX.SetActive(false);
    }

    public void ChangeHealth(int damage, bool hurt)
    {
        if (hurt)
            playerHealth -= damage;
        else
            playerHealth += damage;

        if (playerHealth <= 0)
            Death();

        _shakeCam.Shake(0.25f); // NEEDS DELEGATE

        SoundManager.PlayAudioClip(12);

        if(_checkPort.PlayerNumber == 1)
        {
            if (ReduceP1Heart != null)
                ReduceP1Heart(this);
        }
        else if (_checkPort.PlayerNumber == 2)
        {
            if (ReduceP2Heart != null)
                ReduceP2Heart(this);
        }

        else if (_checkPort.PlayerNumber == 3)
        {
            if (ReduceP3Heart != null)
                ReduceP3Heart(this);
        }
        else
        {
            if (ReduceP4Heart != null)
                ReduceP4Heart(this);
        }

    }

    private void Death()
    {
        SoundManager.PlayAudioClip(10);

        if (OnNewRound != null)
            OnNewRound(this);

        if (OnP1Point != null)
            OnP1Point(this);

        if (OnP2Point != null)
            OnP2Point(this);

        if (OnP3Point != null)
            OnP3Point(this);

        if (OnP4Point != null)
            OnP4Point(this);
        
        Destroy(gameObject);
    }

}
