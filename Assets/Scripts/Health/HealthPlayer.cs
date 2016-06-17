using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HealthPlayer : MonoBehaviour, IHealth
{

    /*
     * This is the class that gets used by all the players regarding health.
     * This class goes about taking damage, and healing.
     */


    //Delegates
    public delegate void PlayerPoint(HealthPlayer player);
    public delegate void PlayerHeart(HealthPlayer player);
    public delegate void PlayerHit(HealthPlayer player);
    public delegate void PlayerDeath();

    public static event PlayerHit OnPlayerHit;
    public PlayerDeath OnPlayerDeath;

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
    private GameObject _sparkleFX;
    //GameObjects
    /////NEEDS DELEGATE

    //Scripts
    private PlayerMovement _checkPort;
    //Scripts

    private int playerHealth = 5;

    public int PlayerHealth
    {
        get { return playerHealth; }
        set { playerHealth += value; }
    }

    private int playerPoint = 1;

    public int GetPlayerPoint
    {
        get { return playerPoint; }
    }

 
    void Start()
    {
        _checkPort = this.GetComponent<PlayerMovement>();
    }

    void Update()
    {
        Armour();
        
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
          
        if (OnPlayerHit != null)
            OnPlayerHit(this);

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

        playerHealth = 0;

        if (OnPlayerDeath != null)
            OnPlayerDeath();

    }

}
