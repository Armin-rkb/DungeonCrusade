using UnityEngine;
using System.Collections;

public class HealthPlayer : MonoBehaviour, IHealth
{

    public delegate void PlayerDeath(HealthPlayer player);
    public static event PlayerDeath OnPlayerDeath;

    [SerializeField]
    private GameObject _roundObject;

    private RoundManager _roundManager;
    private FXManager _fxManager;

    public float health = 5f;

    private int playerCurrency = 5;

    public int PlayerCurrency
    {
        get { return PlayerCurrency;  }
    }
   
    void Start()
    {
        _roundObject = GameObject.Find("RoundManager");
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _fxManager = this.GetComponent<FXManager>();
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

        if (OnPlayerDeath != null)
        {
            OnPlayerDeath(this);
        }

        Destroy(gameObject);
    }
}
