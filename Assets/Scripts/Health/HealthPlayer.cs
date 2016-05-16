using UnityEngine;
using System.Collections;

public class HealthPlayer : MonoBehaviour, IHealth
{

    //Delegates
    public delegate void PlayerDeath(HealthPlayer player);
    public static event PlayerDeath OnP1Death;
    public static event PlayerDeath OnP2Death;
    //Delegates

    //GameObjects
    [SerializeField]
    private GameObject _roundObject;
    //GameObjects

    //Scripts
    private PlayerMovement _checkPort;
    private RoundManager _roundManager;
    private FXManager _fxManager;
    //Scripts


    public float health = 5f;

    private int playerCurrency = 1;

    public int PlayerCurrency
    {
        get { return playerCurrency;  }
    }
   
    void Start()
    {
        _roundObject = GameObject.Find("RoundManager");
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _fxManager = this.GetComponent<FXManager>();
        _checkPort = this.GetComponent<PlayerMovement>();
    }

    void Update()
    {
        if (health >= 6)
            health = 5f;
    }



    public void ChangeHealth(float damage)
    {
        health -= damage;

        if (health <= 0)
            Death();
    }

    private void Death()
    {
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _roundManager.StartCoroutine("AddRound");

        _fxManager.PlayFX(0);

        GrantPoint();

        Destroy(gameObject);

      
    }

    private void GrantPoint()
    {
        if (OnP1Death != null)
        {
            if (_checkPort.PlayerNumber == 2)
                OnP1Death(this);
        }

        if (OnP2Death != null)
        {
            if (_checkPort.PlayerNumber == 1)
                OnP2Death(this);
        }
    }
}
