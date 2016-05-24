using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HealthPlayer : MonoBehaviour, IHealth
{

    //Delegates
    public delegate void PlayerDeath(HealthPlayer player);
    public delegate void PlayerHeart(HealthPlayer player);

    public static event PlayerHeart ReduceHeart;

    public static event PlayerDeath OnP1Death;
    public static event PlayerDeath OnP2Death;

    //Delegates

    //GameObjects
    [SerializeField]
    private GameObject _roundObject;

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
    }

    private int playerPoint = 1;

    public int PlayerPoint
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
        if (playerHealth <= 0)
            playerHealth = 0;
    }

    public void ChangeHealth(int damage)
    {
        playerHealth -= damage;

        if (playerHealth <= 0)
            Death();

        _shakeCam.Shake(0.25f); // NEEDS DELEGATE

        SoundManager.PlayAudioClip(12);

        if (ReduceHeart != null)
            ReduceHeart(this);
    }

    private void Death()
    {
        SoundManager.PlayAudioClip(10);

        _roundManager = _roundObject.GetComponent<RoundManager>();
        _roundManager.StartCoroutine("AddRound");

        GrantPoint();
        
        Destroy(gameObject);
    }

    private void GrantPoint()
    {
        if (OnP1Death != null)
        {
            if (_checkPort.PlayerNumber == 2)
            {
                GameObject newpointP2 = Instantiate(_pointObjects[1], transform.position, Quaternion.identity) as GameObject;
                OnP1Death(this);
            }    
        }

        if (OnP2Death != null)
        {
            if (_checkPort.PlayerNumber == 1)
            {
                GameObject newpointP1 = Instantiate(_pointObjects[0], transform.position, Quaternion.identity) as GameObject;
                OnP2Death(this);     
            }    
        }
    }
}
