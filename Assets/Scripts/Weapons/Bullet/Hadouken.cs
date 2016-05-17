using UnityEngine;
using System.Collections;

public class Hadouken : MonoBehaviour
{
    //Rigidbody of the Gameobject
    private Rigidbody2D rbHadouken;
    //Sprite of this bullet
    private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
    private bool isRight;
    private bool isLeft;

    void Awake()
    {
        rbHadouken = GetComponent<Rigidbody2D>();
        sprite = GetComponent<SpriteRenderer>();
    }

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
    }

    void FixedUpdate()
    {
        if (isRight)
            rbHadouken.velocity = new Vector2(speed, rbHadouken.velocity.y);
        else if (isLeft)
            rbHadouken.velocity = new Vector2(-speed, rbHadouken.velocity.y);
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        rbPlayer.AddForce((rbHadouken.position - rbPlayer.position).normalized * -knockback);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }
            else
                Destroy(this.gameObject);
        }
    }
}
